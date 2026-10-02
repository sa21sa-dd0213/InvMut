import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m0c00858a by calling multiplicate with non-zero msg.value when contract has balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(instanceAddress);
    expect(contractBalanceBefore).to.equal(ethers.parseEther("1.0"));

    // Call multiplicate with non-zero msg.value
    // In the mutant, require((balance + msg.value) == balance) will fail for non-zero msg.value
    // In the original, require((balance + msg.value) >= balance) will pass
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("0.5") });

    // The mutant should revert because msg.value > 0 makes the equality check fail
    await expect(tx).to.be.reverted;
  });
});