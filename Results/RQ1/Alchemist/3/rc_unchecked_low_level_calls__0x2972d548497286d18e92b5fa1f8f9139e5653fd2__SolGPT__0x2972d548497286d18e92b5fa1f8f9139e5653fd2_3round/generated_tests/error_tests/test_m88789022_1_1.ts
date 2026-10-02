import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m88789022 test", function () {
  it("should kill mutant by passing single-element array to trigger out-of-bounds access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token contract to use as caddress
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Fund addr1 with tokens to allow transferFrom
    const amount = ethers.parseEther("10");
    await token.transfer(addr1.address, amount);

    // Approve the demo contract to spend tokens on behalf of addr1
    await token.connect(addr1).approve(await instance.getAddress(), amount);

    // Create single-element arrays (length 1) to trigger the bug
    const tos = [addr2.address];
    const values = [ethers.parseEther("1")];

    // On original: succeeds with one iteration
    // On mutant: reverts when i reaches _tos.length (1) accessing out-of-bounds
    await expect(
      instance.transfer(addr1.address, await token.getAddress(), tos, values)
    ).to.be.reverted;
  });
});