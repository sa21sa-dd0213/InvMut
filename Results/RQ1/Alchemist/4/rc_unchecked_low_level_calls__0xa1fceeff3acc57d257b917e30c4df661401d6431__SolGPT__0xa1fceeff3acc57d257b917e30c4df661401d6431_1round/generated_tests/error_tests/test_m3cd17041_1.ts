import { expect } from "chai";
import { ethers } } from "hardhat";

describe("AirDropContract mutant detection", function () {
  it("should revert when tos array is empty (kills mutant m3cd17041)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as the contract_address parameter
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to owner so transferFrom can work
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(instance.target, ethers.parseEther("100"));

    // Call transfer with empty tos array - should revert on original due to tos.length > 0
    // On mutant, this condition passes (>= 0 always true) and will revert later or succeed unexpectedly
    await expect(
      instance.transfer(token.target, [], [])
    ).to.be.reverted;
  });
});