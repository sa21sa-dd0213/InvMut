import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - md35c0594", function () {
  it("should revert when tos and vs arrays have different lengths (mutant removed the length check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as contract_address for transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // tos array with 2 addresses, vs array with only 1 value (different lengths)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10")]; // only one value, but two recipients

    // The original contract would revert due to length mismatch.
    // The mutant without the check might succeed or behave unexpectedly.
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});