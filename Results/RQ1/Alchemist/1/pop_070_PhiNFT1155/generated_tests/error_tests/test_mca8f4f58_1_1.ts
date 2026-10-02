import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant mca8f4f58 - safeTransferFrom always reverts", function () {
  it("should successfully transfer a non-soulbound token (original behavior), but mutant incorrectly reverts", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract with required parameters
    await instance.initialize(
      1,                              // credChainId
      1,                              // credId
      "test",                         // verificationType
      owner.address                   // protocolFeeDestination
    );
    
    // Test: Try to transfer a token that would be non-soulbound
    // The mutant will revert, but the original would not (if token is not soulbound)
    
    // In the mutant, ANY call to safeTransferFrom with from_ != address(0) will revert
    // because the condition is just "true"
    
    // So we can test with any tokenId - the mutant will always revert
    await expect(
      instance.connect(addr1).safeTransferFrom(
        addr1.address,    // from
        addr2.address,    // to
        1,                // id (any tokenId)
        1,                // value
        "0x"              // data
      )
    ).to.be.revertedWithCustomError(instance, "TokenNotTransferable");
    
    // In the original contract, this would only revert if the token is soulbound.
    // Since we haven't created any art (and thus no soulbound tokens),
    // the original would either succeed or revert with a different error
    // (like balance insufficient), but NOT with TokenNotTransferable.
    // The mutant always reverts with TokenNotTransferable regardless.
  });
});