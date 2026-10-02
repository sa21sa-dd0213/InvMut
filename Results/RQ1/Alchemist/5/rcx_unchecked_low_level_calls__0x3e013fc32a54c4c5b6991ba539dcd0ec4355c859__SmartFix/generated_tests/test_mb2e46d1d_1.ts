import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - overflow check removal", function () {
  it("should kill mutant mb2e46d1d by triggering arithmetic overflow that original would revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Step 1: Fund the contract with some initial balance (e.g., 1 ether)
    const initialFundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await initialFundTx.wait();

    // Step 2: Get current contract balance
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    
    // Step 3: Calculate msg.value that will cause overflow when added to balanceBefore
    // We need msg.value such that balanceBefore + msg.value > max uint256
    const maxUint256 = ethers.MaxUint256;
    // To overflow: msg.value > maxUint256 - balanceBefore
    const overflowValue = maxUint256 - balanceBefore + BigInt(1);
    
    // Step 4: Call multiplicate with overflow amount - original reverts, mutant proceeds
    // The call should be from owner since multiplicate has no access control
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: overflowValue })
    ).to.be.reverted; // This will pass for original, fail for mutant (killing it)
  });
});