import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - m9a254e2a", function () {
  it("should kill mutant that removes Collect access control conditions", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Ensure addr1 has zero balance and cannot call Collect before any deposit
    // On original contract this would revert because acc.balance >= MinSum fails
    // On mutant with condition replaced by true, it would proceed (incorrectly)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"), {
        value: 0
      })
    ).to.be.reverted;
  });
});