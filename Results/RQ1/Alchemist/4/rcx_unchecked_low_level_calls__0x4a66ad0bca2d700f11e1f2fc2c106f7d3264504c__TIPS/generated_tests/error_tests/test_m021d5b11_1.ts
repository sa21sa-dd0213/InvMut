import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m021d5b11", function () {
  it("should detect the * to + mutation in transfer function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's from address is hardcoded as the owner
    const fromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    const contractAddress = "0x1f844685f7Bf86eFcc0e74D8642c54A257111923";

    // Get the token balance of addr1 before the transfer
    const erc20Interface = new ethers.Interface([
      "function balanceOf(address) view returns (uint256)"
    ]);
    const tokenContract = new ethers.Contract(contractAddress, erc20Interface, ethers.provider);
    
    const balanceBefore = await tokenContract.balanceOf(addr1.address);

    // Call transfer with v[0] = 1 (meaning 1 token in original, but 1+1e18 in mutant)
    const tx = await instance.connect(owner).transfer(
      [addr1.address],
      [1]
    );
    await tx.wait();

    const balanceAfter = await tokenContract.balanceOf(addr1.address);
    const actualIncrease = balanceAfter - balanceBefore;

    // Original behavior: v[i] * 1e18 = 1 * 1e18 = 1e18 wei
    // Mutant behavior: v[i] + 1e18 = 1 + 1e18 = 1e18 + 1 wei
    // The difference is exactly 1 wei, which will catch the mutant
    const expectedOriginalIncrease = ethers.parseEther("1");
    
    expect(actualIncrease).to.equal(expectedOriginalIncrease);
  });
});