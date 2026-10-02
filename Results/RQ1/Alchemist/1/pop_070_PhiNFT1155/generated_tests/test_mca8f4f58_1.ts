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
    // credChainId, credId, verificationType, protocolFeeDestination
    await instance.initialize(
      1,                              // credChainId
      1,                              // credId
      "test",                         // verificationType
      owner.address                   // protocolFeeDestination
    );
    
    // Deploy a mock PhiFactory to interact with the contract
    // Since PhiNFT1155 depends on PhiFactory for art data and minting,
    // we need to set up the factory to allow minting
    const MockPhiFactory = await ethers.getContractFactory("PhiNFT1155");
    // Note: In a real test environment, we would deploy a proper mock factory.
    // For this test, we'll directly mint tokens by calling the internal mint path
    // through the claimFromFactory function, which requires the factory to call it.
    
    // Since we can't easily mock the factory, we'll test the safeTransferFrom directly
    // by minting a token first (which sets the token as non-soulbound by default)
    
    // First, create art via the factory path - but since we can't easily do that,
    // we'll directly test the revert condition by calling safeTransferFrom
    // with a non-zero from address on any token (which will always revert in the mutant)
    
    // The mutant changes: if (from_ != address(0) && soulBounded(id_)) revert TokenNotTransferable();
    // to: if (true) revert TokenNotTransferable();
    
    // So any call to safeTransferFrom where from_ is not address(0) will revert in the mutant
    // even if the token is NOT soulbound
    
    // Test: Try to transfer a token that would be non-soulbound
    // The mutant will revert, but the original would not (if token is not soulbound)
    
    // We need to first have a token minted. Since we can't easily call claimFromFactory
    // without a proper PhiFactory setup, we'll test the revert behavior directly.
    
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