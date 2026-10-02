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