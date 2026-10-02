import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant maf15ef8f test", function () {
  it("should detect mutant that removes return true by checking return value", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as caddress
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the EBU contract to spend tokens from 'from' address
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Prepare test parameters
    const addresses = [to.address];
    const amounts = [ethers.parseEther("10")];

    // Call transfer function and capture the return value
    const tx = await instance.connect(owner).transfer(from.address, await token.getAddress(), addresses, amounts);
    const receipt = await tx.wait();

    // For ethers v6, we can decode the return value from the transaction response
    const result = await instance.connect(owner).transfer.staticCall(from.address, await token.getAddress(), addresses, amounts);

    // The original returns true, the mutant returns false (default bool)
    expect(result).to.equal(true);
  });
});