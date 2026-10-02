import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - m7bb55ac3", function () {
  it("should allow owner to transfer own tokens via safeBatchTransferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = addr2.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );

    // Test that safeBatchTransferFrom with empty arrays does NOT revert with ERC1155MissingApprovalForAll
    // This is because when from_ == sender (owner sending own tokens), the original code
    // checks from_ != sender which is false, so it skips the approval check.
    // The mutant would change to from_ == sender and would revert.
    await expect(
      instance.safeBatchTransferFrom(
        owner.address,
        addr1.address,
        [],
        [],
        "0x"
      )
    ).to.not.be.revertedWithCustomError(instance, "ERC1155MissingApprovalForAll");
  });
});