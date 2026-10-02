import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant ma656c349 test", function () {
  it("should allow token owner to transfer their own tokens without approval (kill mutant that changes != to ==)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 with constructor arguments (no constructor args in this case)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before any operations)
    await instance.initialize(
      1,                    // credChainId
      1,                    // credId
      "test",              // verificationType
      addr1.address        // protocolFeeDestination (any address)
    );
    
    // We need a token to exist to test transfer. The contract requires minting via factory,
    // so we'll set up the factory address to be the owner for testing purposes.
    // First, get the phiFactoryContract address from the initialized contract
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // Create a token by calling createArtFromFactory (only callable by phiFactory)
    // For testing, we need to simulate a factory call. Since we can't easily mock,
    // we'll directly test the safeTransferFrom authorization logic by minting a token
    // through the internal _mint function (bypassing factory checks for test purposes)
    
    // Use a different approach - we'll deploy with the owner as the factory
    // and directly test the safeTransferFrom authorization
    
    // Create token ID 1 and mint to owner
    // The contract uses tokenIdCounter starting at 1
    const tokenId = 1;
    
    // Mint token directly to owner (this bypasses factory but tests the transfer logic)
    // We need to call the internal mint through the factory - but for this test
    // we'll verify the authorization check by calling safeTransferFrom with owner as sender
    
    // Since we cannot easily mint without factory, let's test the authorization logic
    // by directly calling safeTransferFrom on any token. The key test is:
    // When from_ == sender (owner), the original allows transfer without approval
    // The mutant would revert because it requires from_ == sender AND approval
    
    // First, mint a token to owner using the claimFromFactory pattern
    // Since we can't easily call the factory, we'll test by ensuring the revert happens
    
    // The key insight: in the original, when from_ == sender, the condition is false
    // (because from_ != sender is false), so it proceeds. In the mutant, when from_ == sender,
    // the condition is true, so it checks isApprovedForAll which may revert.
    
    // To properly test, we need a token that exists. Let's use the fact that
    // the contract allows minting through the factory mechanism.
    // We'll set up a scenario where owner mints to themselves and then tries to transfer
    
    // For this test, we'll deploy a minimal setup and verify the authorization logic
    // by checking that safeTransferFrom doesn't revert when called by the token owner
    
    // Since we can't easily mint in this test environment, let's test the authorization
    // logic by checking that when from_ == msg.sender, the transfer should proceed
    // (original behavior) vs revert (mutant behavior)
    
    // The test: call safeTransferFrom with from_ = owner, sender = owner
    // This should succeed in original but revert in mutant
    
    // We need a token to exist. Let's use the factory to create one.
    // Since the factory is the deployer (owner), we can call createArtFromFactory
    // from the owner address (which is the factory after initialization)
    
    // Actually, let's just test the authorization check directly.
    // The contract has a mint function that's internal, but we can test
    // by calling safeTransferFrom on a non-existent token - it will fail on balance check
    // not on authorization check.
    
    // Better approach: Test with a real token by using the factory flow
    // For simplicity, let's verify that the authorization logic works correctly
    // by checking the revert condition
    
    // Since the contract requires factory interaction for minting, and we're testing
    // the authorization logic, we can test by:
    // 1. Deploy contract
    // 2. Initialize it
    // 3. The owner is the factory
    // 4. Create an art through the factory (which is owner)
    
    // For this test, we'll just verify the safeTransferFrom authorization check
    // by attempting a transfer from owner to addr1 with owner as sender
    // This should NOT revert in the original (since from_ == sender)
    // But WILL revert in the mutant (since from_ == sender triggers the approval check)
    
    // We need a token to exist. Let's use the createArtFromFactory function
    // but we need to set up the factory properly. Since owner is the factory,
    // we can call it directly.
    
    // Actually, the simplest test: check that when from_ == msg.sender,
    // the transfer proceeds without requiring approval.
    // We'll mint a token first using the internal mint (via factory call)
    
    // Since this is complex, let's just test the authorization check by
    // verifying the revert behavior on safeTransferFrom when from_ == sender
    
    // The mutant changes: if (from_ == sender && !isApprovedForAll(from_, sender))
    // This means: if sender IS the owner AND not approved, revert.
    // But the owner should always be able to transfer their own tokens!
    
    // Test: owner tries to transfer their own token to another address
    // In original: should succeed (from_ != sender is false, so no revert)
    // In mutant: should revert (from_ == sender is true, and owner hasn't approved themselves)
    
    // To execute this test, we need a token that exists in owner's balance.
    // We'll mint one by calling the contract as the factory.
    
    // Set up the factory to be able to mint
    // The contract checks msg.sender == address(phiFactoryContract)
    // After initialization, phiFactoryContract is set to msg.sender (owner)
    
    // Create an art first (this requires ETH for the art fee)
    // The artCreateFee might be 0, so let's try
    await instance.createArtFromFactory(1, { value: 0 });
    
    // Now token ID 1 should exist and be mapped to art ID 1
    // But we need to actually mint tokens to owner
    // The claimFromFactory function mints tokens
    
    // For the test, we need owner to have tokens. Let's call claimFromFactory
    // with the proper parameters
    const artId = 1;
    const tokenIdFromArt = await instance.getTokenIdFromFactoryArtId(artId);
    
    // Mint 1 token to owner
    await instance.claimFromFactory(
      artId,
      owner.address,  // minter
      ethers.ZeroAddress,  // ref
      ethers.ZeroAddress,  // verifier
      1,  // quantity
      ethers.ZeroHash,  // data
      ""  // imageURI
    );
    
    // Now owner has a token. Test the transfer:
    // Owner tries to transfer their own token to addr1
    // This should succeed in original but revert in mutant
    
    // In original: from_ = owner, sender = owner, from_ != sender is false
    // so the condition is false, no revert
    
    // In mutant: from_ = owner, sender = owner, from_ == sender is true
    // so it checks isApprovedForAll(owner, owner) which returns false
    // condition is true, so it reverts with ERC1155MissingApprovalForAll
    
    await expect(
      instance.safeTransferFrom(
        owner.address,  // from_
        addr1.address,  // to_
        tokenIdFromArt, // id_
        1,              // value_
        "0x"            // data_
      )
    ).to.not.be.reverted;
    
    // Verify the transfer happened
    expect(await instance.balanceOf(addr1.address, tokenIdFromArt)).to.equal(1);
  });
});