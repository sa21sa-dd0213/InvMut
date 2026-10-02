import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m48b51aec - hasQuorum operator replacement", function () {
  it("should detect mutant where / is replaced with + in hasQuorum", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER and VAULT contracts since DAO depends on them
    const MockVADER = await ethers.getContractFactory("iVADER");
    const MockVAULT = await ethers.getContractFactory("iVAULT");

    const vader = await MockVADER.deploy();
    const vault = await MockVAULT.deploy();

    await vader.waitForDeployment();
    await vault.waitForDeployment();

    // Deploy ControlledVAULT helper contract
    const ControlledVAULT = await ethers.getContractFactory("ControlledVAULT");
    const controlledVault = await ControlledVAULT.deploy();
    await controlledVault.waitForDeployment();

    // Deploy DAO with controlled vault
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    await dao.init(await vader.getAddress(), ethers.ZeroAddress, await controlledVault.getAddress());

    // Set controlled values
    await controlledVault.setTotalWeight(100);
    await controlledVault.setMemberWeight(addr1.address, 34);

    // Create a proposal
    await dao.newAddressProposal(addr1.address, "DAO");

    // Now vote on proposal 1 as addr1 (weight = 34)
    await dao.connect(addr1).voteProposal(1);

    // Check hasQuorum - original would return true, mutant would return false
    const hasQuorumResult = await dao.hasQuorum(1);

    // The mutant would return false here because 34 > 103 is false
    // Original returns true because 34 > 33.33 is true
    // This test will fail on the mutant, killing it
    expect(hasQuorumResult).to.equal(true);
  });
});