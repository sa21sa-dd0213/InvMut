import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m079e7c1a", function () {
  it("should revert when a transferFrom call fails (kills mutant that replaced !_s with false)", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token that will fail on transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));

    // Attempt to call transfer with a transferFrom that will fail
    // (from has not approved the EBU contract, so call should revert)
    await expect(
      instance.transfer(
        from.address,
        await token.getAddress(),
        [to.address],
        [ethers.parseEther("10")]
      )
    ).to.be.reverted;
  });
});