import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test", function () {
  it("should kill mutant mdbd4e99b by verifying deposit and withdraw match exactly", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    // User withdraws all
    const tx = await instance.connect(user).withdrawAll();
    await tx.wait();

    // After withdrawal, user's credit should be 0
    expect(await instance.credit(user.address)).to.equal(0);

    // Contract balance should be 0
    expect(await ethers.provider.getBalance(instance.target)).to.equal(0);
  });
});