import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test for contractURI", function () {
  it("should kill mutant m8f0cae42 by expecting a non-empty string from contractURI()", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 (constructor takes no arguments, uses _disableInitializers())
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract with required parameters
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDestination = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDestination);

    // Call contractURI() - in the original it returns a string, in the mutant it returns nothing
    // The mutant removes the 'return' keyword, so it will return empty bytes instead of the URI string
    const result = await instance.contractURI();
    
    // Expect the result to be a non-empty string (the original behavior)
    // The mutant will return an empty string, causing this assertion to fail
    expect(result).to.be.a("string");
    expect(result.length).to.be.greaterThan(0);
  });
});