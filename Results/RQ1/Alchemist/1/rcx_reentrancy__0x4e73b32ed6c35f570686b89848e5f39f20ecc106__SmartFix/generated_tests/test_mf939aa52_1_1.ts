import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant detection - mf939aa52", function () {
    it("should revert when Collect is called by a contract that rejects ETH, but mutant incorrectly succeeds", async function () {
        const [owner] = await ethers.getSigners();
        
        // Deploy the PRIVATE_ETH_CELL contract (no constructor arguments)
        const CellFactory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
        const cell = await CellFactory.deploy();
        await cell.waitForDeployment();

        // Deploy a malicious receiver contract that reverts on receive
        const RejectorFactory = await ethers.getContractFactory(
            "contract Rejector { receive() external payable { revert(); } }"
        );
        const rejector = await RejectorFactory.deploy();
        await rejector.waitForDeployment();

        // Initialize the contract
        await cell.connect(owner).SetMinSum(0);
        await cell.connect(owner).SetLogFile(owner.address); // dummy log address
        await cell.connect(owner).Initialized();

        // Fund the contract via deposit from owner
        const depositAmount = ethers.parseEther("1.0");
        await owner.sendTransaction({
            to: await cell.getAddress(),
            value: depositAmount
        });

        // Now call Collect from the rejector contract (which will revert on receive)
        await expect(
            cell.connect(rejector).Collect(depositAmount)
        ).to.be.reverted;

        // Verify balance remains unchanged (mutant would have deducted it)
        const balanceAfter = await cell.balances(await rejector.getAddress());
        expect(balanceAfter).to.equal(depositAmount);
    });
});