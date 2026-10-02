import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test", function () {
  it("should detect mutant md8755058 by calling multiplicate with non-zero msg.value while contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0"),
    });

    // Verify contract has balance
    const balanceBefore = await ethers.provider.getBalance(instanceAddress);
    expect(balanceBefore).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with a non-zero msg.value (e.g., 0.5 ether)
    // Original: require is always true, call succeeds
    // Mutant: require fails because (balance + msg.value) > balance, causing revert
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("0.5"),
    });

    // The original contract would succeed; the mutant would revert
    await expect(tx).to.not.be.reverted;

    // Verify that the funds were transferred to addr1
    const balanceAfter = await ethers.provider.getBalance(instanceAddress);
    expect(balanceAfter).to.equal(0);
  });
});