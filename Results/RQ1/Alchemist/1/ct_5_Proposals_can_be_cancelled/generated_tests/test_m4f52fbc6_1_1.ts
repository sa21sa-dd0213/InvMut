import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m4f52fbc6 - isEqual always returns true", function () {
  it("should revert when canceling a proposal with a different type, but mutant incorrectly allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Deploy mock VAULT
    const VAULTFactory = await ethers.getContractFactory("VAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();

    // Deploy mock VADER
    const VADERFactory = await ethers.getContractFactory("VADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();

    // Deploy mock USDV
    const USDVFactory = await ethers.getContractFactory("USDV");
    const usdv = await USDVFactory.deploy();
    await usdv.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), await usdv.getAddress(), await vault.getAddress());

    // Create first proposal of type "GRANT"
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));

    // Create second proposal of type "REWARD" (different type)
    await dao.newAddressProposal(addr1.address, "REWARD");

    // Vote on both proposals to make them have minority (needed for cancel)
    await dao.connect(addr1).voteProposal(1);
    await dao.connect(addr1).voteProposal(2);

    // Test isEqual directly with different strings
    const bytes1 = ethers.toUtf8Bytes("GRANT");
    const bytes2 = ethers.toUtf8Bytes("REWARD");

    // On original contract, this would return false, on mutant it returns true
    const result = await dao.isEqual(bytes1, bytes2);

    // For the mutant, isEqual always returns true, so this assertion would fail on original
    // But we want to detect the mutant, so we check that the behavior is wrong
    expect(result).to.equal(false);

    // Additional test: cancelProposal with different types should revert
    // but mutant allows it
    await expect(
      dao.connect(owner).cancelProposal(1, 2)
    ).to.be.revertedWith("Must be finalising");

    // Make proposal 1 finalising by voting with enough weight
    // We need to manipulate the vault to give addr1 enough weight
    // For a complete test, we would need to set up the vault mock properly
    // The key assertion is that isEqual("GRANT", "REWARD") should return false
    // On the mutant it returns true, which would cause cancelProposal to succeed
    // when it should revert with "Must be same"
  });
});