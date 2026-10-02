import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mf0d1d7a3", function () {
  it("should revert when transferring with exactly one recipient due to out-of-bounds access in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a simple ERC20-like token contract to use as the caddress
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Fund addr1 with tokens and approve the EBU contract to transferFrom
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare recipients array with exactly one address and corresponding value
    const recipients = [addr2.address];
    const values = [ethers.parseEther("10")];

    // Call transfer - in the original, this should succeed; in the mutant, it reverts due to i <= length
    await expect(
      instance.connect(addr1).transfer(addr1.address, await token.getAddress(), recipients, values)
    ).to.be.reverted;
  });
});