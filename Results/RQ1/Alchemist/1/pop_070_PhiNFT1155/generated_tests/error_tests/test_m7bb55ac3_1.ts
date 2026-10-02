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

    // We need to mint tokens first. Since mint is internal, we need to go through claimFromFactory
    // But claimFromFactory requires the caller to be the phiFactoryContract.
    // Let's use the _mint function indirectly by setting up the factory relationship.
    // The owner is set as the phiFactoryContract during initialization.
    // We'll create an art first using createArtFromFactory which requires being the phiFactory.
    // Since owner == phiFactoryContract after init, we can call createArtFromFactory.
    
    // First we need to set up a mock phiFactory that returns valid data for artData
    // But the contract checks phiFactoryContract.artData(artId).artist for some operations.
    // Let's directly mint by calling the internal mint through claimFromFactory.
    
    // Simpler approach: deploy a mock PhiFactory to make the contract work
    // For this test, let's just test the safeBatchTransferFrom directly after minting
    
    // Since we can't easily mint without a real PhiFactory, let's test the condition
    // that the mutant changes by examining the authorization logic.
    
    // The mutant changes: if (from_ == sender && !isApprovedForAll(from_, sender))
    // Original: if (from_ != sender && !isApprovedForAll(from_, sender))
    
    // For the owner to transfer their own tokens (from_ == sender), the original allows it
    // The mutant would revert because from_ == sender AND !isApprovedForAll(from_, sender) is true
    // (since owner doesn't need to approve themselves)
    
    // To properly test this, we need tokens. Let's deploy a minimal helper.
    
    // Actually, we can test the revert condition by calling safeBatchTransferFrom with
    // from_ = owner, to = addr1, and owner as sender. The original would NOT revert.
    // The mutant WOULD revert because owner == sender and owner hasn't approved themselves.
    
    // But without minted tokens, the transfer would revert for other reasons.
    // We need to mint tokens first.
    
    // Let's use the createArtFromFactory to create an art and get a token minted
    // But createArtFromFactory requires msg.value >= artFee and the factory to exist.
    
    // For simplicity, let's just test that the authorization check logic is correct
    // by calling safeBatchTransferFrom with empty arrays (which should revert differently)
    // and checking the revert reason.
    
    // Actually, let's properly test by minting through the claim path.
    // Since we can't easily set up a full PhiFactory, let's test a simpler scenario.
    
    // The key insight: the mutant changes from_ != sender to from_ == sender.
    // So a transfer where from_ == sender (owner sending own tokens) should succeed in original
    // but revert in mutant with ERC1155MissingApprovalForAll.
    
    // Let's test this by calling safeBatchTransferFrom with from_ = owner, and owner as msg.sender
    // with empty arrays - this should revert with ERC1155InvalidArrayLength in both versions
    // but the mutant would first check the authorization and revert with a different error.
    
    // Actually, let's just try to call safeBatchTransferFrom and see what happens.
    // The function checks from_ != sender first in original, from_ == sender in mutant.
    
    // For owner sending their own tokens (from_ = owner, sender = owner):
    // Original: from_ != sender is FALSE, so it skips the revert -> continues to check array lengths
    // Mutant: from_ == sender is TRUE, then checks !isApprovedForAll(owner, owner) which is TRUE -> REVERTS
    
    // So we can detect the mutant by calling safeBatchTransferFrom with owner as both from_ and sender
    // and expecting it to NOT revert with ERC1155MissingApprovalForAll
    
    // However, it will revert with ERC1155InvalidArrayLength since ids_ and values_ are empty.
    // We need to provide valid arrays to test the authorization.
    
    // Let's mint tokens first by calling the internal _mint through a workaround.
    // Since we can't easily mint, let's just test the authorization logic specifically.
    
    // The simplest test: call safeBatchTransferFrom with from_ = owner, ids_ = [], values_ = []
    // Original: reverts with ERC1155InvalidArrayLength (skips the auth check since from_ != sender is false)
    // Mutant: reverts with ERC1155MissingApprovalForAll (fails the auth check since from_ == sender is true)
    
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