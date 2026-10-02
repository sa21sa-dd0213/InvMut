import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MStableYieldSource mutant detection", function () {
  it("should detect mutant that changes subtraction to addition in redeemToken", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock mAsset token and savings contract for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockMAsset = await MockERC20.deploy("Mock mAsset", "mASSET", ethers.parseEther("1000000"));
    await mockMAsset.waitForDeployment();

    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockMAsset.getAddress());
    await mockSavings.waitForDeployment();

    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();

    // Fund the owner with mAsset and approve the yield source
    await mockMAsset.transfer(owner.address, ethers.parseEther("1000"));
    await mockMAsset.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // First supply some tokens to the yield source to have a balance
    const supplyAmount = ethers.parseEther("100");
    await instance.connect(owner).supplyTokenTo(supplyAmount, owner.address);

    // Now redeem a known amount and capture the returned actual amount
    const redeemAmount = ethers.parseEther("50");
    const tx = await instance.connect(owner).redeemToken(redeemAmount);
    const receipt = await tx.wait();

    // Get the balance before and after from the event or calculate expected
    // The actual amount received should equal the difference between balance after and before
    // In a correct implementation, mAssetsActual should equal the amount actually received
    // from the savings contract (which is redeemAmount in this mock setup)
    const expectedActualAmount = redeemAmount; // In our mock, redeemUnderlying returns the full amount

    // The mutant would return balanceAfter + balanceBefore instead of balanceAfter - balanceBefore
    // This would be much larger than the expected amount
    // We verify the returned value from the event or by checking the transfer

    // Check the Redeemed event for the actual amount
    const event = receipt.logs.find(log => {
      try {
        const parsed = instance.interface.parseLog(log);
        return parsed.name === "Redeemed";
      } catch {
        return false;
      }
    });
    const parsedEvent = instance.interface.parseLog(event);
    const actualAmount = parsedEvent.args.actualAmount;

    // The actual amount should equal the expected amount (difference, not sum)
    expect(actualAmount).to.equal(expectedActualAmount);
    // The mutant would produce actualAmount = balanceAfter + balanceBefore which would be wrong
  });
});