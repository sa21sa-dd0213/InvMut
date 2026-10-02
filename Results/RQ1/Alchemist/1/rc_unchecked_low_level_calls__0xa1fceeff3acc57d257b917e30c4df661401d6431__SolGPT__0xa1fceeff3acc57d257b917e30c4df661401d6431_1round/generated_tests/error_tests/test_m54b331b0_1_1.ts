import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract - Kill mutant m54b331b0 (vs.length >= 0)", function () {
  it("should revert when tos is non-empty but vs is empty (original reverts, mutant fails)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract that has transferFrom
    // Since AirDropContract calls transferFrom on contract_address,
    // we need a contract that implements transferFrom.
    // We'll deploy a minimal ERC20 contract for testing.
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner so transferFrom can succeed
    await token.mint(owner.address, ethers.parseEther("100"));
    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare test data: non-empty tos array, empty vs array
    const tos = [addr1.address, addr2.address];
    const vs = [];

    // This should revert on original (vs.length > 0 fails)
    // On mutant, require(vs.length >= 0) passes but loop will fail
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});