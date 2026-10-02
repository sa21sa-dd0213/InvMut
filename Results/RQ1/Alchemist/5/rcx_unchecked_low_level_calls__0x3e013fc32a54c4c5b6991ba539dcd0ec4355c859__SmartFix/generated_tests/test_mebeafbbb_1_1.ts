import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should detect mutant mebeafbbb by verifying contract balance becomes zero after multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Check initial balance
    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(initialBalance).to.equal(fundAmount);

    // Now call multiplicate with msg.value equal to current contract balance
    const sendAmount = fundAmount;
    const tx = await instance.connect(owner).multiplicate(addr1.address, {
      value: sendAmount
    });
    await tx.wait();

    // Check that contract balance is zero (original behavior)
    // Mutant would leave 1 wei, so this assertion would fail on mutant
    const finalBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(finalBalance).to.equal(0);
  });
});