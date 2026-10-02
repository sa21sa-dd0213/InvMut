import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE - Kill mutant mde102c39 (remove revert in Collect)", function () {
  it("should revert when external call fails in Collect, preventing balance loss", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy BANK_SAFE (no constructor arguments needed)
    const BankFactory = await ethers.getContractFactory("BANK_SAFE");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();

    // Deploy a LogFile contract (required for Log.AddMessage to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize the bank: set MinSum, set LogFile, and call Initialized
    await bank.SetMinSum(ethers.parseEther("0.1"));
    await bank.SetLogFile(await log.getAddress());
    await bank.Initialized();

    // User deposits 1 ETH
    await bank.connect(user).Deposit({ value: ethers.parseEther("1") });

    // Verify initial balance
    expect(await bank.balances(user.address)).to.equal(ethers.parseEther("1"));

    // Create a malicious contract that will reject ETH in its receive function
    const RejectorFactory = await ethers.getContractFactory("Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Deploy a contract that will act as the user (reverter)
    const ReverterFactory = await ethers.getContractFactory("Reverter");
    const reverter = await ReverterFactory.deploy();
    await reverter.waitForDeployment();

    // Fund the reverter contract
    await owner.sendTransaction({
      to: await reverter.getAddress(),
      value: ethers.parseEther("2")
    });

    // Have reverter deposit into bank
    await bank.connect(reverter).Deposit({ value: ethers.parseEther("1") });

    // Now reverter tries to collect - this should fail because reverter's receive reverts
    const balanceBefore = await bank.balances(await reverter.getAddress());

    // This should revert in the original
    await expect(
      bank.connect(reverter).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;

    // Verify balance is unchanged (original behavior)
    const balanceAfter = await bank.balances(await reverter.getAddress());
    expect(balanceAfter).to.equal(balanceBefore);
  });
});

// Helper contracts for testing
contract Reverter {
    receive() external payable {
        revert("I reject ETH");
    }
}

contract NoReceive {
    // No receive or fallback function
}

contract CollectAttacker {
    address public bank;

    constructor(address _bank) {
        bank = _bank;
    }

    receive() external payable {}

    function attack(uint amount) public {
        (bool success, ) = bank.call(abi.encodeWithSignature("Collect(uint256)", amount));
        require(!success, "Expected failure");
    }
}