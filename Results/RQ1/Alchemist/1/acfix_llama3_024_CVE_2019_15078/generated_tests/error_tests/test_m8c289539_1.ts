import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m8c289539 - division instead of subtraction in transfer", function () {
  it("should detect the mutant by checking sender balance after transfer with non-multiple amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: fund addr1 with some tokens
    const fundAmount = ethers.parseEther("1000");
    await instance.connect(owner).transfer(addr1.address, fundAmount);

    // Get initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);

    // Transfer an amount that does not evenly divide the balance
    // Using 333 tokens, since 1000 / 333 = 3 (integer division) not 667 (subtraction)
    const transferAmount = ethers.parseEther("333");
    await instance.connect(addr1).transfer(addr2.address, transferAmount);

    // Get balance after transfer
    const finalBalance = await instance.balanceOf(addr1.address);

    // In the original: 1000 - 333 = 667
    // In the mutant: 1000 / 333 = 3 (integer division)
    // The test expects the correct subtraction result
    expect(finalBalance).to.equal(initialBalance - transferAmount);
  });
});