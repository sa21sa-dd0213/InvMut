import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant mc0798aa3 - allowance return value", function () {
  it("should return the correct allowance after approve, killing the mutant that removes the return statement", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy ANCHToken with constructor arguments (router and USDToken addresses)
    // For testing purposes, we use dummy addresses since we're testing allowance functionality
    const ROUTER_ADDRESS = "0x0000000000000000000000000000000000000001";
    const USD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000002";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(ROUTER_ADDRESS, USD_TOKEN_ADDRESS);
    await instance.waitForDeployment();

    // Approve addr1 to spend 1000 tokens from owner
    const approveAmount = ethers.parseEther("1000");
    const approveTx = await instance.connect(owner).approve(addr1.address, approveAmount);
    await approveTx.wait();

    // Query allowance and verify it returns the correct value
    const allowance = await instance.allowance(owner.address, addr1.address);
    expect(allowance).to.equal(approveAmount);

    // Also test that a different spender has zero allowance
    const zeroAllowance = await instance.allowance(owner.address, addr2.address);
    expect(zeroAllowance).to.equal(0);
  });
});