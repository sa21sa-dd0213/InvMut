import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m0a597063 - initializer modifier removal", function () {
  it("should revert when initialize is called a second time after initial initialization", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor takes no arguments, uses _disableInitializers())
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const implementation = await Factory.deploy();
    await implementation.waitForDeployment();
    
    // Create a proxy that uses the implementation
    const proxyFactory = await ethers.getContractFactory("ERC1967Proxy");
    const proxy = await proxyFactory.deploy(await implementation.getAddress(), "0x");
    await proxy.waitForDeployment();
    
    // Attach PhiNFT1155 to the proxy address
    const phiNFT = await ethers.getContractAt("PhiNFT1155", await proxy.getAddress());
    
    // Initialize parameters
    const credChainId = 1;
    const credId = 42;
    const verificationType = "test";
    const protocolFeeDestination = owner.address;
    
    // First initialization should succeed
    await phiNFT.initialize(credChainId, credId, verificationType, protocolFeeDestination);
    
    // Second initialization should revert because of initializer modifier (original behavior)
    // But mutant removes the initializer modifier, so it would NOT revert
    await expect(
      phiNFT.initialize(credChainId, credId, verificationType, protocolFeeDestination)
    ).to.be.reverted;
  });
});