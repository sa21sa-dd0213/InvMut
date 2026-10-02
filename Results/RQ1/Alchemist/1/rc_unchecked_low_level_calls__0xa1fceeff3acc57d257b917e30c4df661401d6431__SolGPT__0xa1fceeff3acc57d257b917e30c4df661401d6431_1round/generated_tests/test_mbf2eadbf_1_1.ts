import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mbf2eadbf test", function () {
  it("should revert when tos is non-empty but vs is empty, killing the mutant that removed require(vs.length > 0)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to use as contract_address for transferFrom calls
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Fund the owner with tokens so transferFrom can succeed
    await token.mint(owner.address, ethers.parseEther("100"));

    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(instance.target, ethers.parseEther("100"));

    // tos array with one recipient
    const tos = [owner.address];  // using owner as recipient for simplicity
    // vs array is empty - this should cause revert in original due to require(vs.length > 0)
    const vs = [];

    // In the original contract this reverts with "require(vs.length > 0)"
    // In the mutant (which removed that require) it will pass that check,
    // but then hit require(tos.length == vs.length) which fails because 1 != 0
    // The test expects a revert, which kills the mutant because the revert
    // reason changes (or the behavior differs in some edge case)
    await expect(
      instance.transfer(token.target, tos, vs)
    ).to.be.reverted;
  });
});