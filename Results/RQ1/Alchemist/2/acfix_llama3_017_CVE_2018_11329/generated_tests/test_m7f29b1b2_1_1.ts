import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - buyDrugs msg.value-1", function () {
    it("should detect the mutant by comparing actual drugs received with expected calculation", async function () {
        const [owner, user] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("EtherCartel");
        const contract = await Factory.deploy();
        await contract.waitForDeployment();

        // Seed the market first
        await contract.seedMarket(1000, { value: ethers.parseEther("10") });

        // Get initial balance
        const initialBalance = await ethers.provider.getBalance(await contract.getAddress());

        // Calculate expected drugs for a specific ETH amount using the original formula
        const ethAmount = ethers.parseEther("1");
        
        // Get contract balance before buy
        const balanceBefore = await ethers.provider.getBalance(await contract.getAddress());
        
        // Execute buyDrugs
        const tx = await contract.connect(user).buyDrugs({ value: ethAmount });
        await tx.wait();

        // Get actual drugs credited to user
        const actualDrugs = await contract.connect(user).getMyDrugs();

        // Calculate expected drugs using the original formula
        // The original calculateDrugBuy uses msg.value (full amount)
        const expectedDrugs = await contract.calculateDrugBuy(ethAmount, balanceBefore);

        // The mutant uses msg.value-1, so actual should be less than expected
        // If mutant is present, actualDrugs will be based on ethAmount-1
        const mutantDrugs = await contract.calculateDrugBuy(ethAmount - 1n, balanceBefore);

        // Assert that actual matches mutant behavior (less than expected)
        // This will pass on mutant (actual == mutantDrugs) and fail on original (actual == expectedDrugs)
        expect(actualDrugs).to.equal(mutantDrugs);
        expect(actualDrugs).to.be.lessThan(expectedDrugs);
    });
});