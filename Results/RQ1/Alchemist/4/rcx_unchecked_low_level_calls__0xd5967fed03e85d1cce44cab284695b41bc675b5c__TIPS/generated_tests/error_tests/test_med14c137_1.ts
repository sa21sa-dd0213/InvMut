import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6)", function () {
  it("should kill mutant med14c137 by testing that a successful transferFrom call does not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract that the demo contract can call
    const ERC20Factory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to addr1 and approve the demo contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(addr1.address, mintAmount);
    await token.connect(addr1).approve(await instance.getAddress(), mintAmount);

    // The demo contract's transfer function will call token.transferFrom(addr1, addr2, amount)
    const transferAmount = ethers.parseEther("10");
    const recipients = [addr2.address];

    // This call should succeed on the original contract (no revert)
    // On the mutant, it will always revert because if (true) always triggers revert
    await expect(
      instance.transfer(addr1.address, await token.getAddress(), recipients, transferAmount)
    ).to.not.be.reverted;
  });
});