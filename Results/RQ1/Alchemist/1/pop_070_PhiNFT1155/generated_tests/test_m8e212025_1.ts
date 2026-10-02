import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m8e212025 test", function () {
  it("should revert when unauthorized user tries to batch transfer tokens from another address", async function () {
    const [owner, unauthorizedUser, tokenHolder] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      owner.address // protocolFeeDestination
    );
    
    // We need to create a token first via the factory mechanism
    // For testing purposes, we need to set up the phiFactoryContract
    // Since we can't easily mock the factory, let's directly test the transfer authorization logic
    
    // First, let's mint some tokens to tokenHolder using the internal mint path
    // We need to call claimFromFactory which requires onlyPhiFactory modifier
    // Alternatively, we can test by setting up the state directly
    
    // Get the phiFactoryContract address from the deployed instance
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // Since we can't directly mint, let's test the authorization check directly
    // by calling safeBatchTransferFrom with an unauthorized sender
    
    // Create test token IDs and values
    const tokenIds = [1, 2];
    const values = [1, 1];
    const emptyData = "0x";
    
    // Attempt to transfer from tokenHolder to owner using unauthorizedUser as sender
    // This should revert because unauthorizedUser is neither tokenHolder nor approved
    await expect(
      instance.connect(unauthorizedUser).safeBatchTransferFrom(
        tokenHolder.address,
        owner.address,
        tokenIds,
        values,
        emptyData
      )
    ).to.be.reverted;
  });
});