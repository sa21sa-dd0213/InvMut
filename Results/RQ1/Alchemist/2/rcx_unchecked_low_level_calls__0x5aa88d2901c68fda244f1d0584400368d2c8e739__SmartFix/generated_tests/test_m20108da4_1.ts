import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant detection - m20108da4", function () {
  it("should detect mutant where msg.value-1 is used instead of msg.value in the multiplicate function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with 2 ether
    await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("2")
    });

    const contractBalanceBefore = await ethers.provider.getBalance(contractAddress);
    expect(contractBalanceBefore).to.equal(ethers.parseEther("2"));

    // Send exactly the contract balance (2 ether) as msg.value
    // In original: msg.value (2) >= balance (2) -> true -> transfer happens
    // In mutant: msg.value-1 (1) >= balance (2) -> false -> transfer does NOT happen
    await instance.connect(addr1).multiplicate(addr2.address, { value: ethers.parseEther("2") });

    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);

    // If original logic: balance should be 0 (all funds transferred to addr2)
    // If mutant logic: balance should still be 2 (transfer didn't trigger)
    expect(contractBalanceAfter).to.equal(ethers.parseEther("2"));
  });
});