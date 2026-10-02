import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m4890fefe - uri function", function () {
  it("should return the correct token URI from phiFactoryContract.getTokenURI", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock factory that implements IPhiFactory
    const MockFactory = await ethers.getContractFactory("MockPhiFactoryForTest");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    // Deploy PhiNFT1155
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract via the mock factory (so phiFactoryContract = mockFactory address)
    const credChainId = 1;
    const credId = 1;
    const verificationType = "SIGNATURE";
    const protocolFeeDest = owner.address;

    await mockFactory.initializePhiNFT1155(
      instance.target,
      credChainId,
      credId,
      verificationType,
      protocolFeeDest
    );

    // Create an art via the mock factory to set up state
    const artId = 1;
    await mockFactory.createArt(instance.target, artId);

    // Now call uri with tokenId = 1 (which corresponds to artId 1)
    const uriResult = await instance.uri(1);

    // The mock returns a fixed URI
    expect(uriResult).to.equal("https://example.com/token/1");
    
    // Also verify it's not empty
    expect(uriResult.length).to.be.greaterThan(0);
  });
});