import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m09d3e01c - safeTransferFrom authorization check", function () {
  it("should revert when an unauthorized address tries to transfer tokens", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const PhiNFT1155 = await ethers.getContractFactory("PhiNFT1155");
    const instance = await PhiNFT1155.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Initialize the contract (needed to set up state)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDestination = owner.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );

    // Get the phiFactoryContract address from the initialized contract
    const phiFactoryAddress = await instance.phiFactoryContract();
    
    // The phiFactoryContract is set to msg.sender (owner) during initialization
    // We need to deploy a minimal mock factory that the PhiNFT1155 can use
    
    // Deploy a minimal factory that can create art and mint tokens
    const MinimalPhiFactory = await ethers.getContractFactory("MinimalPhiFactory");
    const factory = await MinimalPhiFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();

    // Set up the factory with proper values
    // Set phiRewardsAddress to a simple address
    const phiRewardsAddress = owner.address;
    await factory.setPhiRewardsAddress(phiRewardsAddress);
    
    // Set artCreateFee
    const artCreateFee = ethers.parseEther("0.001");
    await factory.setArtCreateFee(artCreateFee);
    
    // Set protocolFeeDestination
    await factory.setProtocolFeeDestination(owner.address);

    // Create art through the factory
    const artId = 1;
    const mintFee = ethers.parseEther("0.01");
    const maxSupply = 100;
    const startTime = 0;
    const endTime = 9999999999;
    
    // Set art data in factory
    await factory.setArtData(
      artId,
      owner.address, // artist
      addr1.address, // receiver
      credChainId,
      maxSupply,
      endTime,
      startTime,
      "0x", // credData
      "test_uri",
      mintFee,
      false // soulBounded
    );

    // Now we need to make the PhiNFT1155 recognize our factory
    // Since we can't change the factory after initialization, we need to
    // deploy a new PhiNFT1155 that will use our factory
    
    // Deploy a new instance and initialize with our factory
    const PhiNFT1155v2 = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await PhiNFT1155v2.deploy();
    await instance2.waitForDeployment();
    
    // We need to set the factory contract address
    // Since initialize sets phiFactoryContract to msg.sender, we need to
    // call initialize from the factory address... but that's complex.
    // Instead, let's use a proxy approach or just test with the current instance
    
    // Actually, the simplest approach is to use the fact that during initialization,
    // phiFactoryContract is set to msg.sender (owner). So owner can act as the factory.
    // But owner doesn't have the proper methods. Let's try a different approach.
    
    // Let's directly test the safeTransferFrom authorization
    // We'll set up the state manually to have tokens and then test
    
    // Since the contract is complex and the test environment doesn't have all dependencies,
    // let's create a simpler test that checks the revert reason directly
    
    // The test should verify that an unauthorized transfer reverts with the correct error
    // We need tokens to exist first
    
    // Let's try to call createArtFromFactory as the factory (which is owner)
    // But we need to set the factory address first
    // Since phiFactoryContract is set to owner during init, and owner has no code,
    // we can't call onlyPhiFactory functions.
    
    // Let's check if we can call claimFromFactory through the public claim interface
    // The Claimable contract has signatureClaim, merkleClaim, and claim functions
    // that call the phiFactory
    
    // Since we can't easily mint tokens in this test environment without the full factory,
    // let's test the authorization check by directly checking the revert reason
    // when calling safeTransferFrom with invalid parameters
    
    // Even without tokens, the safeTransferFrom will check authorization first
    // before checking balances (in ERC1155 implementation)
    
    // Let's try to call safeTransferFrom and expect it to revert
    // with ERC1155MissingApprovalForAll since addr3 is not approved
    
    // First, we need to make sure the token exists and addr1 has some balance
    // Let's try to mint through the public interface if possible
    
    // Check if we can call the claim function (inherited from Claimable)
    // The claim function in Claimable calls phiFactoryContract.claim()
    // which requires the factory to be set up properly
    
    // Let's try a different approach - use the signatureClaim function
    // but we need a valid signature from the phi signer
    
    // For this test, let's try to create a scenario where we have tokens
    // by deploying a minimal factory that works with our contract
    
    // Let's try to set up the factory address on a new instance
    // by deploying through a proxy pattern
    
    // Actually, let's just test the authorization check directly
    // by ensuring the revert reason is correct
    
    // Since we can't easily mint tokens without the full factory setup,
    // let's at least verify that the contract is deployed and initialized correctly
    
    const credId_ = await instance.credId();
    expect(credId_).to.equal(credId);
    
    const tokenIdCounter = await instance.tokenIdCounter();
    expect(tokenIdCounter).to.equal(1);
    
    const verificationType_ = await instance.verificationType();
    expect(verificationType_).to.equal(verificationType);
    
    // Now let's try to test the safeTransferFrom authorization
    // Even without tokens, calling safeTransferFrom from an unauthorized address
    // should revert because the sender check happens before balance check
    
    // Let's check the revert reason
    await expect(
      instance.connect(addr3).safeTransferFrom(
        addr1.address,
        addr2.address,
        1, // tokenId
        1, // value
        "0x" // data
      )
    ).to.be.revertedWithCustomError(instance, "ERC1155MissingApprovalForAll");
    
    console.log("Test passed: unauthorized transfer correctly reverted with ERC1155MissingApprovalForAll");
  });
});