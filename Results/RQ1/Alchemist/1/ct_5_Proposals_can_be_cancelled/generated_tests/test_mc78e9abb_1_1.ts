import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant mc78e9abb - kill test", function () {
  it("should revert when calling finaliseProposal on a non-finalising proposal", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DAO contract
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const daoAddress = await instance.getAddress();

    // Deploy mock VADER, USDV, and VAULT contracts for initialization
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADERFactory.deploy();
    await mockVADER.waitForDeployment();

    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULTFactory.deploy();
    await mockVAULT.waitForDeployment();

    // Initialize DAO
    await instance.init(
      await mockVADER.getAddress(),
      await mockUSDV.getAddress(),
      await mockVAULT.getAddress()
    );

    // Create a new grant proposal (this will NOT be in finalising state)
    await instance.connect(addr1).newGrantProposal(addr2.address, ethers.parseEther("100"));

    // Attempt to finalise the proposal without it being in finalising state
    // The original contract requires mapPID_finalising[proposalID] == true
    // The mutant removes this check, so it will NOT revert
    await expect(
      instance.connect(owner).finaliseProposal(1)
    ).to.be.revertedWith("Must be finalising");
  });
});