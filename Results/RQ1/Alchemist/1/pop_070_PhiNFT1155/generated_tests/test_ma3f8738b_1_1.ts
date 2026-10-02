import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant test - ma3f8738b", function () {
  it("should kill the mutant by verifying getPhiFactoryContract returns the correct address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract to set phiFactoryContract
    const credChainId = 1;
    const credId = 123;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = owner.address;

    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );

    // Get the expected phiFactoryContract address (should be msg.sender of initialize)
    const expectedFactoryAddress = owner.address;

    // Call getPhiFactoryContract and assert it returns the correct address
    const actualFactoryAddress = await instance.getPhiFactoryContract();

    // In the original, this should return the phiFactoryContract address
    // In the mutant, the return statement is removed, so it would return address(0) or unexpected value
    expect(actualFactoryAddress).to.equal(expectedFactoryAddress);
  });
});