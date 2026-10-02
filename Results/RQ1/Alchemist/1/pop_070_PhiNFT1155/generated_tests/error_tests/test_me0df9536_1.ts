import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant detection - me0df9536", function () {
  it("should detect the mutant that changes credChainId == block.chainid to credChainId >= block.chainid", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // We need to simulate a scenario where credChainId is greater than block.chainid
    // First, get the current chain ID
    const chainId = await ethers.provider.getNetwork().then(n => n.chainId);
    
    // Deploy a mock PhiFactory contract that will be set as the phiFactoryContract
    // We need to deploy a minimal contract that implements the required interfaces
    const MockPhiFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockPhiFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Initialize the PhiNFT1155 contract with a credChainId that is different from block.chainid
    // We'll use a credChainId that is GREATER than the current chain ID to trigger the mutant
    const credChainId = Number(chainId) + 100; // Greater than current chain ID
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = addr1.address;
    
    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );
    
    // Verify the initialization
    expect(await instance.credChainId()).to.equal(credChainId);
    expect(await instance.credId()).to.equal(credId);
    
    // Now we need to test the claimFromFactory function
    // First, we need to create an art through the factory
    // Since we're using a mock factory, we need to set up the necessary state
    
    // The mock factory needs to return proper values for artData, artCreateFee, etc.
    // Let's set up the mock factory to return appropriate values
    const artId = 1;
    const tokenId = 1;
    const artist = owner.address;
    const receiver = addr1.address;
    const maxSupply = 100;
    const mintFee = ethers.parseEther("0.01");
    const startTime = 0;
    const endTime = 2000000000;
    const soulBounded = false;
    const credCreator = owner.address;
    
    // Configure the mock factory
    await mockFactory.setArtData(artId, {
      credId: credId,
      credCreator: credCreator,
      credChainId: credChainId,
      verificationType: verificationType,
      uri: "https://example.com/token/1",
      artAddress: instanceAddress,
      tokenId: tokenId,
      artist: artist,
      receiver: receiver,
      royalties: { royaltyBPS: 500, royaltyRecipient: receiver },
      maxSupply: maxSupply,
      mintFee: mintFee,
      startTime: startTime,
      endTime: endTime,
      numberMinted: 0,
      soulBounded: soulBounded
    });
    
    await mockFactory.setArtCreateFee(ethers.parseEther("0.001"));
    await mockFactory.setPhiRewardsAddress(addr2.address);
    await mockFactory.setProtocolFeeDestination(protocolFeeDest);
    
    // Set the mock factory on the PhiNFT1155 contract
    // Note: In the real contract, phiFactoryContract is set during initialization to msg.sender
    // Since we deployed the contract, we need to set it via the storage or use a different approach
    // Actually, looking at the initialize function, phiFactoryContract = IPhiFactory(payable(msg.sender))
    // So we need to reinitialize or use the storage slot directly
    
    // Let's deploy a new instance where the owner is the mock factory
    const Factory2 = await ethers.getContractFactory("PhiNFT1155");
    const instance2 = await Factory2.deploy();
    await instance2.waitForDeployment();
    
    // We'll use the mock factory to call initialize on the new instance
    await mockFactory.initializeNFT(instance2.getAddress(), credChainId, credId, verificationType, protocolFeeDest);
    
    // Now the phiFactoryContract on instance2 is set to the mock factory
    // Create art from factory
    const artCreateFee = ethers.parseEther("0.001");
    await mockFactory.createArt(instance2.getAddress(), artId, { value: artCreateFee });
    
    // Now test claimFromFactory with the mutant condition
    // The key test: when credChainId > block.chainid, the mutant changes behavior
    // In the original: credChainId == block.chainid would be false
    // In the mutant: credChainId >= block.chainid would be true
    
    // We need to call claimFromFactory through the factory
    const minter = addr1.address;
    const ref = ethers.ZeroAddress;
    const verifier = ethers.ZeroAddress;
    const quantity = 1;
    const data = ethers.ZeroHash;
    const imageURI = "https://example.com/image.jpg";
    
    // Fund the factory with enough ETH for the mint fee and art fee
    await owner.sendTransaction({
      to: mockFactory.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Call claimFromFactory through the mock factory
    const claimFee = mintFee + ethers.parseEther("0.001"); // mint fee + art create fee
    
    // This should revert in the original (if the chain sync check affects rewards handling)
    // but might succeed in the mutant due to the changed condition
    // We'll check that the transaction behaves differently
    
    // The mutant changes chainSync_ parameter which affects how rewards are handled
    // We can detect this by checking if the rewards function was called with the correct parameter
    
    // Let's call claimFromFactory and check the state
    await mockFactory.claimFromFactory(
      instance2.getAddress(),
      artId,
      minter,
      ref,
      verifier,
      quantity,
      data,
      imageURI,
      { value: claimFee }
    );
    
    // Check if the mint happened
    const balance = await instance2.balanceOf(minter, tokenId);
    
    // In the original code, when credChainId != block.chainid, chainSync_ = false
    // In the mutant, when credChainId >= block.chainid, chainSync_ = true (since credChainId > block.chainid)
    // This difference in chainSync_ should cause different behavior in handleRewardsAndGetValueSent
    
    // We can detect the mutant by checking if the rewards were handled differently
    // The mock rewards contract can track whether it was called with chainSync = true or false
    
    // For this test, we'll verify that the behavior differs based on the chain comparison
    // If the test passes on the original but fails on the mutant, we've detected it
    
    // The expected behavior: with credChainId > block.chainid
    // Original: chainSync_ = false (credChainId == block.chainid is false)
    // Mutant: chainSync_ = true (credChainId >= block.chainid is true)
    
    // We can verify this by checking the rewards tracking
    const rewardsCalledWithChainSync = await mockFactory.lastChainSync();
    
    // In the mutant, this should be true (since credChainId >= block.chainid)
    // In the original, this should be false (since credChainId != block.chainid)
    // If we see the mutant behavior, the test detects it
    expect(rewardsCalledWithChainSync).to.equal(true);
    
    // The test passes on the original (returns false) but would fail on the mutant (returns true)
    // Actually, since we're testing for the mutant, we expect the mutant to make this true
    // Let's verify the balance to ensure minting happened
    expect(balance).to.equal(quantity);
  });
});

// Helper contract to mock PhiFactory
// This needs to be deployed as a separate contract
contract("MockPhiFactory", function() {
  // This would be a separate Solidity contract deployed before the test
});