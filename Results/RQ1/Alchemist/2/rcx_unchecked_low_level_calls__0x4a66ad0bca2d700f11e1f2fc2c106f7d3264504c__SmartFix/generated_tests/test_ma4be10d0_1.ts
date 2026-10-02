import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant ma4be10d0 test", function () {
  it("should revert with overflow-causing v[i] value on original but pass on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's 'from' address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to use that address as the caller (msg.sender)
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const fromSigner = await ethers.getImpersonatedSigner(fromAddress);
    
    // Fund the impersonated signer with some ETH for gas
    await ethers.provider.send("hardhat_setBalance", [
      fromAddress,
      "0x1000000000000000000" // 1 ETH
    ]);

    // Value that causes overflow when multiplied by 1e18
    // 2^256 / 10^18 ≈ 1.1579e77, so any value > that will overflow
    const overflowValue = ethers.MaxUint256 / 1000000000000000000n + 1n;
    
    const tos = ["0x1f844685f7Bf86eFcc0e74D8642c54A257111923"];
    const values = [overflowValue];

    // This should revert on the original (== check) but pass on mutant (<= check)
    // If it reverts, the mutant is killed (mutant allows what original rejects)
    await expect(
      instance.connect(fromSigner).transfer(tos, values)
    ).to.be.reverted;
  });
});