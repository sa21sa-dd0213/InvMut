import { expect } from "chai";
import { ethers } } from "hardhat";

describe("BANK_SAFE mutant test - m748de163", function () {
  it("should revert on deposit of positive amount due to subtraction in require", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    // BANK_SAFE has no constructor arguments
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial balance of addr1 is 0
    // Deposit 1 wei - this should revert on the mutant because:
    // (0 - 1) >= 0 is false, but original allows (0 + 1) >= 0
    await expect(
      instance.connect(addr1).Deposit({ value: ethers.parseEther("0.000000000000000001") })
    ).to.be.reverted;
  });
});