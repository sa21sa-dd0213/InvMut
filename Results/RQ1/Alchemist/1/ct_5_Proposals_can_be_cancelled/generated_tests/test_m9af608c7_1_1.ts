import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m9af608c7 test", function () {
  it("should kill mutant by testing isEqual with same strings returns false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");

    const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const mockVADER = await MockVADERFactory.deploy();
    await mockVADER.waitForDeployment();

    const mockVAULT = await MockVAULTFactory.deploy();
    await mockVAULT.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Test isEqual with two identical strings - should return false in mutant (wrong behavior)
    const result = await dao.isEqual(
      ethers.toUtf8Bytes("GRANT"),
      ethers.toUtf8Bytes("GRANT")
    );

    // In original contract, this should return true
    // In mutant (m9af608c7), the == is changed to !=, so it returns false
    // Therefore, we expect the mutant to return false (killing it)
    expect(result).to.equal(false);
  });
});