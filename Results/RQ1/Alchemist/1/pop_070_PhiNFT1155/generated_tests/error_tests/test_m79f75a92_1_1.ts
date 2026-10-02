import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m79f75a92 - getPhiFactoryContract", function () {
  it("should kill the mutant by calling signatureClaim which relies on getPhiFactoryContract returning address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = addr1.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Call signatureClaim - this should revert on the mutant because
    // getPhiFactoryContract() returns address(0) instead of the actual phiFactoryContract
    // The call will try to interact with address(0) which will fail
    await expect(
      instance.connect(addr2).signatureClaim()
    ).to.be.reverted;
  });

  it("should kill the mutant by calling merkleClaim which relies on getPhiFactoryContract returning address(0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "MERKLE";
    const protocolFeeDest = addr1.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Call merkleClaim - this should revert on the mutant because
    // getPhiFactoryContract() returns address(0) instead of the actual phiFactoryContract
    // The call will try to interact with address(0) which will fail
    await expect(
      instance.connect(addr2).merkleClaim()
    ).to.be.reverted;
  });
});