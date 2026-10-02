import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant kill test - m398f084a", function () {
  it("should revert when transferring amount less than sender's balance (kills <= mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const initialSupply = 1000;
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "TestToken", "TST");
    await instance.waitForDeployment();

    // Transfer a smaller amount than the owner's full balance
    // Original: requires balance >= value (1000 >= 100) => passes
    // Mutant: requires balance <= value (1000 <= 100) => fails
    await expect(
      instance.transfer(addr1.address, 100)
    ).to.be.reverted;
  });
});