import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m4890fefe - uri function", function () {
  it("should return the correct token URI from phiFactoryContract.getTokenURI", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract (required before use)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = owner.address;
    
    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);
    
    // Deploy a mock PhiFactory to return a known URI
    const MockFactory = await ethers.getContractFactory("IPhiFactory");
    // Since IPhiFactory is an interface, we need a concrete mock
    const mockFactoryArtifact = await ethers.getContractFactory("PhiNFT1155MockFactory");
    const mockFactory = await mockFactoryArtifact.deploy();
    await mockFactory.waitForDeployment();
    
    // Set the phiFactoryContract address
    // Note: This is done internally during initialize, but we need to override it for testing
    // Since phiFactoryContract is a public variable, we can set it directly if there's a setter
    // However, looking at the contract, there's no setter - it's set during initialize to msg.sender
    // We need to deploy the factory first and then initialize with it as the deployer
    
    // Alternative approach: Deploy the mock factory, then deploy PhiNFT1155 from the mock factory address
    // But that's complex. Instead, let's test the function after proper initialization
    
    // Create an art via the factory to populate _tokenIdToArtId
    // We'll use the createArtFromFactory function which requires msg.sender = phiFactoryContract
    // Since we can't easily change phiFactoryContract after deployment, let's test with a different approach
    
    // Actually, the simplest test: call uri with a tokenId that has a mapping, and expect it to call getTokenURI
    // We need to set up the state such that _tokenIdToArtId[tokenId] returns a valid artId
    // and phiFactoryContract.getTokenURI returns something
    
    // Let's use the claimFromFactory function to set up state
    // But this requires msg.sender = phiFactoryContract
    
    // Given the complexity, let's test the function's behavior by checking that it returns something (not empty)
    // when called with a valid tokenId after proper setup
    
    // For a practical test, we'll check that the function returns a string
    // The mutant removes the return, so the function will return empty bytes
    
    // First, let's deploy a simple mock that implements IPhiFactory
    const MockFactory2 = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory2 = await MockFactory2.deploy();
    await mockFactory2.waitForDeployment();
    
    // We need to re-deploy PhiNFT1155 with the mock factory as msg.sender
    // Since initialize sets phiFactoryContract = msg.sender
    // Let's deploy PhiNFT1155 and initialize it from the mock factory's address
    // We can do this by using impersonation or by having the mock factory call initialize
    
    // Simpler: deploy PhiNFT1155, then use storage manipulation to set phiFactoryContract
    // But that's not possible from outside
    
    // Let's use a different approach - test the function directly with a tokenId that exists
    // We'll create the art first using createArtFromFactory
    
    // Actually, looking at the contract more carefully:
    // createArtFromFactory is only callable by phiFactoryContract (onlyPhiFactory modifier)
    // claimFromFactory is also only callable by phiFactoryContract
    
    // The easiest way to test this is to:
    // 1. Deploy a mock factory that can call these functions
    // 2. Have the mock factory initialize PhiNFT1155
    // 3. Have the mock factory create an art
    // 4. Then call uri
    
    // Let's create a simple mock contract
    const MockFactoryArtifact = await ethers.getContractFactory("MockPhiFactoryForTest");
    const mockFactory3 = await MockFactoryArtifact.deploy();
    await mockFactory3.waitForDeployment();
    
    // Now initialize PhiNFT1155 from the mock factory
    await mockFactory3.initializePhiNFT1155(instance.target, credChainId, credId, verificationType, protocolFeeDest);
    
    // Now create an art via the mock factory
    await mockFactory3.createArt(instance.target, 1);
    
    // Now call uri with tokenId = 1
    const uriResult = await instance.uri(1);
    
    // The original function should return the URI from getTokenURI
    // The mutant would return an empty string (or revert depending on implementation)
    // Since the mock returns a fixed URI, we can check it
    expect(uriResult).to.equal("https://example.com/token/1");
    
    // Also verify it's not empty (would catch the mutant)
    expect(uriResult.length).to.be.greaterThan(0);
  });
});

// Helper mock contract for testing
// This would be defined in a separate file, but for completeness:
// contracts/mocks/MockPhiFactoryForTest.sol
/*
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../PhiNFT1155.sol";

contract MockPhiFactoryForTest {
    function initializePhiNFT1155(
        address nftAddress,
        uint256 credChainId,
        uint256 credId,
        string memory verificationType,
        address protocolFeeDest
    ) external {
        PhiNFT1155(nftAddress).initialize(credChainId, credId, verificationType, protocolFeeDest);
    }
    
    function createArt(address nftAddress, uint256 artId) external payable {
        PhiNFT1155(nftAddress).createArtFromFactory(artId);
    }
    
    function getTokenURI(uint256) external pure returns (string memory) {
        return "https://example.com/token/1";
    }
    
    function artData(uint256) external pure returns (IPhiFactory.ArtData memory) {
        return IPhiFactory.ArtData({
            credId: 1,
            credCreator: address(0),
            credChainId: 1,
            verificationType: "",
            uri: "",
            artAddress: address(0),
            tokenId: 1,
            artist: address(0),
            receiver: address(0),
            royalties: ICreatorRoyaltiesControl.RoyaltyConfiguration(0, address(0)),
            maxSupply: 100,
            mintFee: 0,
            startTime: 0,
            endTime: 0,
            numberMinted: 0,
            soulBounded: false
        });
    }
    
    function protocolFeeDestination() external pure returns (address) {
        return address(0);
    }
    
    function artCreateFee() external pure returns (uint256) {
        return 0;
    }
    
    function phiRewardsAddress() external pure returns (address) {
        return address(0);
    }
    
    function contractURI(address) external pure returns (string memory) {
        return "";
    }
}
*/