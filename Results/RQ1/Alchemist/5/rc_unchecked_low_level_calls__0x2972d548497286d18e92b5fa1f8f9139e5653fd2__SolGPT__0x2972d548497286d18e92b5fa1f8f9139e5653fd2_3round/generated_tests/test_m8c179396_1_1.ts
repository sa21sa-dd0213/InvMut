import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8c179396 - loop condition changed from < to >", function () {
  it("should revert when _tos array has elements, because mutant loop never executes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that has transferFrom
    const tokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await tokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Approve demo contract to spend tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare test data: send 50 tokens to addr1
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("50")];

    // In the original, this would succeed and transfer tokens.
    // In the mutant, the loop never runs (i starts at 0, condition i>length is false),
    // so no transferFrom call happens - the function returns true without reverting.
    // We expect no tokens transferred, so addr1 balance should be 0.
    await instance.transfer(owner.address, await token.getAddress(), recipients, amounts);

    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(0);
  });
});