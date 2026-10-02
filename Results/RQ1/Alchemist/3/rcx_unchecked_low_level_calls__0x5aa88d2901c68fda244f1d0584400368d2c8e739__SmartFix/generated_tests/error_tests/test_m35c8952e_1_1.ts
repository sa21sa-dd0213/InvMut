import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant kill test - m35c8952e", function () {
  it("should kill mutant by sending msg.value equal to contract balance, causing transfer to fail on mutant but succeed on original", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract (no constructor arguments for this contract)
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Fund the contract with exactly 1 ETH from owner
    const fundTx = await owner.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    const contractBal = await ethers.provider.getBalance(contractAddress);
    expect(contractBal).to.equal(ethers.parseEther("1.0"));

    // Now call multiplicate with msg.value = 1 ETH (satisfies msg.value >= balance)
    // Original: transfer(address(this).balance + msg.value) = transfer(1 + 1) = 2 ETH
    // But contract only has 1 ETH initially + 1 ETH received = 2 ETH total at time of transfer
    // So original succeeds
    // Mutant: transfer(1 + 1 + 1) = 3 ETH - contract only has 2 ETH - FAILS
    const multiplicateTx = instance.connect(owner).multiplicate(addr1.address, {
      value: ethers.parseEther("1.0")
    });

    // On original this would succeed, on mutant it reverts
    await expect(multiplicateTx).to.be.reverted;
  });
});