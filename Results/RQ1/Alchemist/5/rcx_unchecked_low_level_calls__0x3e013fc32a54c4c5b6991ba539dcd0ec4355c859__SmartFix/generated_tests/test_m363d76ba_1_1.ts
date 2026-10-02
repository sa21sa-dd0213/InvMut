import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant m363d76ba by calling multiplicate with non-zero msg.value when contract has balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Verify contract has balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(ethers.parseEther("10"));

    // Get initial balance of addr2 to verify transfer
    const addr2BalanceBefore = await ethers.provider.getBalance(addr2.address);

    // Call multiplicate with msg.value less than contract balance
    // Original: require((balance + msg.value) >= balance) - always true
    // Mutant: require((balance - msg.value) >= balance) - false when msg.value > 0
    const tx = instance.connect(owner).multiplicate(addr2.address, {
      value: ethers.parseEther("5")
    });

    // The mutant will revert because (10 - 5) >= 10 is false
    // The original would succeed and transfer 15 ETH to addr2
    await expect(tx).to.be.reverted;
  });
});