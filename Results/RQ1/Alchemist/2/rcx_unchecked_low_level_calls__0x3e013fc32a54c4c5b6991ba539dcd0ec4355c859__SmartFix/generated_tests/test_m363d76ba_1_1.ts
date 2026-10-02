import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant m363d76ba", function () {
  it("should detect the mutant by calling multiplicate with nonzero msg.value and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(
      await instance.getAddress()
    );
    expect(contractBalanceBefore).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with a nonzero msg.value (0.5 ETH)
    // Original: should succeed and transfer balance to addr1
    // Mutant: will revert because (balance - msg.value) >= balance is false
    const tx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("0.5")
    });

    // If the mutant is present, this transaction will revert
    await expect(tx).to.not.be.reverted;
  });
});