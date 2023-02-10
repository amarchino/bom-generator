<#function licenseFormat licenses>
    <#assign result = ""/>
    <#list licenses as license>
        <#assign result = result + "\n        <License>" +license + "</License>"/>
    </#list>
    <#return result>
</#function>
<#function artifactFormat p>
  <#if p.name?index_of('Unnamed') &gt; -1>
    <#assign name = p.artifactId />
  <#else>
    <#assign name = p.name />
  </#if>
  <#return "<Name>" + name + "</Name>\n      <GroupId>" + p.groupId + "</GroupId>\n      <ArtifactId>" + p.artifactId + "</ArtifactId>\n      <Version>" + p.version + "</Version>\n      <Url>" + (p.url!"no url defined") + "</Url>">
</#function>

<ThirdPartDependencies>
  <Size>${dependencyMap?size}</Size>
<#if dependencyMap?size == 0>
  <Message>The project has no dependencies.</Message>
<#else>
  <Message>Lists of ${dependencyMap?size} third-party dependencies.</Message>
  <Dependencies>
<#list dependencyMap as e>
  <#assign project = e.getKey()/>
  <#assign licenses = e.getValue()/>
    <Dependency>
      ${artifactFormat(project)}
      <Licenses>${licenseFormat(licenses)}
      </Licenses>
    </Dependency>
</#list>
  </Dependencies>
</#if>
</ThirdPartDependencies>
