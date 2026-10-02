import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbac3ac5d test", function () {
  it("should detect the mutant that adds 1 extra wei to user balance on deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ether
    const tx = await instance.connect(user).addToBalance({ value: depositAmount });
    await tx.wait();

    // Check the balance stored for the user
    const balance = await instance.getBalance(user.address);

    // On the original, balance should equal depositAmount
    // On the mutant, balance = depositAmount + 1 wei, so this assertion fails
    expect(balance).to.equal(depositAmount);
  });
});