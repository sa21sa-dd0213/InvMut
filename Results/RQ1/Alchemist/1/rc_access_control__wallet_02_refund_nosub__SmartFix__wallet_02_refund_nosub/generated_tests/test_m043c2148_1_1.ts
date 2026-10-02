import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when a new user with zero balance deposits for the first time (kills mutant m043c2148)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero balance, attempting first deposit
    // Original: assertion passes (0 + value > 0)
    // Mutant: assertion fails (0 * value > 0 => false)
    await expect(
      instance.connect(addr1).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});