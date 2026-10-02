import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - getFactoryArtId mutant test", function () {
  it("should properly override getFactoryArtId from IPhiNFT1155 interface", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );
    
    // Get the contract's interface and check if getFactoryArtId exists
    const contractInterface = instance.interface;
    
    // Verify that getFactoryArtId is a valid function on the contract
    expect(() => {
      contractInterface.getFunction("getFactoryArtId");
    }).to.not.throw();
    
    // Call getFactoryArtId with a tokenId that doesn't exist yet
    // This should return 0 since no art has been created
    const result = await instance.getFactoryArtId(0);
    expect(result).to.equal(0);
    
    // Verify the function is callable through the IPhiNFT1155 interface
    // by checking the function signature matches
    const getFactoryArtIdFragment = contractInterface.getFunction("getFactoryArtId");
    expect(getFactoryArtIdFragment.name).to.equal("getFactoryArtId");
    expect(getFactoryArtIdFragment.inputs.length).to.equal(1);
    expect(getFactoryArtIdFragment.inputs[0].type).to.equal("uint256");
    expect(getFactoryArtIdFragment.outputs.length).to.equal(1);
    expect(getFactoryArtIdFragment.outputs[0].type).to.equal("uint256");
  });
});