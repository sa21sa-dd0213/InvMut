import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant kill test - mc5cbb662", function () {
  it("should revert when user with zero credit tries to withdrawAll (kills >= mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a contract that reverts on receive
    const ReverterFactory = await ethers.getContractFactory(
      "contract Reverter { receive() external payable { revert(); } }"
    );
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Deploy a caller contract that can interact with the DAO
    const CallerFactory = await ethers.getContractFactory(
      `contract Caller {
        function callWithdrawAll(address dao) external {
          (bool ok,) = dao.call(abi.encodeWithSignature("withdrawAll()"));
          require(ok);
        }
        function deposit(address dao) external payable {
          (bool ok,) = dao.call{value: msg.value}(abi.encodeWithSignature("deposit()"));
          require(ok);
        }
        receive() external payable { revert(); }
      }`
    );
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();

    // Fund the caller with some ether
    await owner.sendTransaction({
      to: await caller.getAddress(),
      value: ethers.parseEther("1")
    });

    // Caller deposits to DAO
    await caller.connect(owner).deposit(await instance.getAddress(), { value: ethers.parseEther("1") });

    // Now caller has credit = 1 ether, withdraw all to set credit to 0
    await caller.connect(owner).callWithdrawAll(await instance.getAddress());

    // Now caller has credit = 0
    // Original: oCredit > 0 is false, so nothing happens (no revert)
    // Mutant: oCredit >= 0 is true, so it executes the block, sends 0 value to caller which reverts
    // This will revert on mutant but not on original
    await expect(
      caller.connect(owner).callWithdrawAll(await instance.getAddress())
    ).to.not.be.reverted;
  });
});